import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant mab727b40 test", function () {
  it("should revert when calling transfer with a valid _tos array due to mutant changing > to <", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a valid token address (can be any address since we only test the length check)
    const tokenAddress = addr1.address;
    
    // Create an array with one recipient (length > 0, which should pass original but fail mutant)
    const recipients = [addr2.address];
    const amount = 100;

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length is always >= 0, the mutant condition will always be false
    // So calling with any valid array should revert
    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, amount)
    ).to.be.reverted;
  });
});