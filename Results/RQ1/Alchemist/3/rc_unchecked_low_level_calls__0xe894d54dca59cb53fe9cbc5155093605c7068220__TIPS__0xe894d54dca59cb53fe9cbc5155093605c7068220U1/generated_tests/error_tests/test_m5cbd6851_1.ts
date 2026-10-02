import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test", function () {
  it("should revert when external call to caddress fails, killing mutant that replaces !_s with false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-contract address (EOA) as caddress - calling transferFrom on it will fail
    const invalidCAddress = addr2.address;
    
    // Setup: owner has tokens to transfer (but we'll use a fake token address that doesn't have transferFrom)
    const v = 100;
    const decimals = 18;
    const tos = [addr1.address];
    
    // The call to caddress will fail because addr2 is an EOA, not a contract with transferFrom
    // Original contract reverts on failure; mutant would not revert
    await expect(
      instance.transfer(owner.address, invalidCAddress, tos, v, decimals)
    ).to.be.reverted;
  });
});