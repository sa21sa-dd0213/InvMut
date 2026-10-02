import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m0d99e683 test", function () {
  it("should succeed with valid non-empty recipients array, but mutant with < will revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test parameters
    const recipients = [addr1.address];
    const amount = 1;
    const decimals = 0;
    const tokenAddress = ethers.ZeroAddress; // Using zero address as placeholder

    // This call should succeed on original contract but revert on mutant
    // because mutant requires _tos.length < 0 which is impossible
    await expect(
      instance.transfer(
        owner.address,
        tokenAddress,
        recipients,
        amount,
        decimals
      )
    ).to.be.reverted;
  });
});