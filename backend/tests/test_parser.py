import pytest
from app.services.parser import parse_genopro_file, _parse_date


def test_parse_date_full():
    assert _parse_date("1 JAN 1970") == "1970-01-01"


def test_parse_date_month_year():
    assert _parse_date("MAR 1985") == "1985-03-01"


def test_parse_date_year_only():
    assert _parse_date("2005") == "2005-01-01"


def test_parse_date_none():
    assert _parse_date(None) is None


SAMPLE_XML = b"""<?xml version="1.0"?>
<GenoPro>
  <People>
    <Individual Id="I1" Gender="M">
      <Name><First>John</First><Last>Smith</Last></Name>
      <Birth><Date>1 JAN 1950</Date><Place>London</Place></Birth>
    </Individual>
    <Individual Id="I2" Gender="F">
      <Name><First>Mary</First><Last>Jones</Last></Name>
      <Birth><Date>MAR 1955</Date></Birth>
    </Individual>
  </People>
  <Families>
    <Family Id="F1" HusbandId="I1" WifeId="I2">
      <Marriage><Date>15 JUN 1975</Date></Marriage>
      <Children><Child Id="I3"/></Children>
    </Family>
  </Families>
</GenoPro>
"""


def test_parse_xml():
    result = parse_genopro_file(SAMPLE_XML)
    assert len(result["persons"]) == 2
    assert result["persons"][0]["id"] == "I1"
    assert result["persons"][0]["first_name"] == "John"
    assert result["persons"][0]["dob"] == "1950-01-01"
    assert result["persons"][0]["birth_place"] == "London"
    assert len(result["families"]) == 1
    assert result["families"][0]["id"] == "F1"
    assert result["families"][0]["husband_id"] == "I1"
    assert "I3" in result["families"][0]["children"]


SAMPLE_XML_UPPERCASE = b"""<?xml version="1.0"?>
<GenoPro>
  <People>
    <Individual ID="I1" Gender="M">
      <Name><First>John</First><Last>Smith</Last></Name>
      <Birth><Date>1 JAN 1950</Date><Place>London</Place></Birth>
    </Individual>
    <Individual ID="I2" Gender="F">
      <Name><First>Mary</First><Last>Jones</Last></Name>
      <Birth><Date>MAR 1955</Date></Birth>
    </Individual>
  </People>
  <Families>
    <Family ID="F1" HusbandID="I1" WifeID="I2">
      <Marriage><Date>15 JUN 1975</Date></Marriage>
      <Children><Child ID="I3"/></Children>
    </Family>
  </Families>
</GenoPro>
"""


def test_parse_xml_uppercase_attributes():
    result = parse_genopro_file(SAMPLE_XML_UPPERCASE)
    assert len(result["persons"]) == 2
    assert result["persons"][0]["id"] == "I1"
    assert result["persons"][0]["first_name"] == "John"
    assert len(result["families"]) == 1
    assert result["families"][0]["id"] == "F1"
    assert result["families"][0]["husband_id"] == "I1"
    assert result["families"][0]["wife_id"] == "I2"
    assert "I3" in result["families"][0]["children"]


SAMPLE_XML_PEDIGREE = b"""<?xml version="1.0"?>
<GenoPro>
  <People>
    <Individual ID="I1" Gender="M">
      <Name><First>John</First><Last>Smith</Last></Name>
    </Individual>
    <Individual ID="I2" Gender="F">
      <Name><First>Mary</First><Last>Jones</Last></Name>
    </Individual>
    <Individual ID="I3" Gender="M">
      <Name><First>Child</First><Last>One</Last></Name>
    </Individual>
  </People>
  <Families>
    <Family ID="F1">
      <Marriage><Date>15 JUN 1975</Date></Marriage>
    </Family>
  </Families>
  <PedigreeLinks>
    <PedigreeLink PedigreeLink="Parent" Family="F1" Individual="I1"/>
    <PedigreeLink PedigreeLink="Parent" Family="F1" Individual="I2"/>
    <PedigreeLink PedigreeLink="Biological" Family="F1" Individual="I3"/>
  </PedigreeLinks>
</GenoPro>
"""


def test_parse_xml_pedigree_links():
    result = parse_genopro_file(SAMPLE_XML_PEDIGREE)
    assert len(result["persons"]) == 3
    assert len(result["families"]) == 1
    assert result["families"][0]["id"] == "F1"
    assert result["families"][0]["husband_id"] == "I1"
    assert result["families"][0]["wife_id"] == "I2"
    assert "I3" in result["families"][0]["children"]


