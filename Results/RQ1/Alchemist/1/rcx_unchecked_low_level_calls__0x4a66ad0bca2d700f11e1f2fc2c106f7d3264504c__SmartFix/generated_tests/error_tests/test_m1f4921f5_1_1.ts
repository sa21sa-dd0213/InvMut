import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1f4921f5 - kill test", function () {
  it("should revert when called from an address lower than the authorized address", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a wallet with a low address for testing
    const lowerWallet = new ethers.Wallet(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      ethers.provider
    );
    
    const tos = [owner.address];
    const values = [1];
    
    // The transaction should revert because lowerWallet address is not the authorized address
    await expect(
      instance.connect(lowerWallet).transfer(tos, values)
    ).to.be.reverted;
  });
});