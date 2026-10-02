import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf test", function () {
  it("should detect mutant that changes < to <= in loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an array with a single recipient address
    const recipients = [addr1.address];
    const tokenAddress = owner.address; // using a regular address as token contract
    const value = 100;

    // The original contract should succeed with one recipient
    // The mutant will try to access _tos[1] (out of bounds) and revert
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, value)
    ).to.be.reverted;
  });
});