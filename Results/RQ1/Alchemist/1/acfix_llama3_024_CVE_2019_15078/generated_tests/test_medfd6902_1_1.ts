import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - medfd6902", function () {
  it("should detect mutation in getTokens() where value calculation is changed from division to addition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial value
    const initialValue = await instance.value();

    // First call to getTokens() from addr1 (not blacklisted, distribution not finished)
    await instance.connect(addr1).getTokens({ value: 0 });

    // Get value after first call
    const valueAfterFirstCall = await instance.value();

    // In original code: value = (value / 100000) * 99999 => value decreases
    // In mutant: value = (value + 100000) * 99999 => value increases dramatically
    // Expected: value should be less than initial (decreasing)
    // If mutant: value will be much larger than initial

    expect(valueAfterFirstCall).to.be.lessThan(initialValue);

    // Make second call to verify the decreasing pattern continues
    await instance.connect(addr1).getTokens({ value: 0 });
    const valueAfterSecondCall = await instance.value();

    // In original: value keeps decreasing
    // In mutant: value keeps increasing (will fail the require(value <= totalRemaining) eventually)
    expect(valueAfterSecondCall).to.be.lessThan(valueAfterFirstCall);
  });
});