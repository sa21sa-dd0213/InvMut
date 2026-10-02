import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant detection - m39231ab2", function () {
  it("should revert when _tos array is empty (original behavior) but mutant would not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = addr1.address; // using a random address as token (will fail call but we test the require first)
    const emptyRecipients: string[] = [];
    const value = ethers.parseEther("1");

    // The original contract requires _tos.length > 0, so calling with empty array should revert
    // The mutant with >= 0 would pass the require and attempt the loop (which does nothing)
    // Since the call inside the loop will revert on a random address, the mutant will revert later,
    // but we specifically test that the empty array causes a revert at the require statement
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyRecipients, value)
    ).to.be.reverted;
  });
});