import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m084efa6c test", function () {
  it("should revert when external call fails, but mutant does not revert", async function () {
    const [owner, from, addr1] = await ethers.getSigners();

    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-existent address (EOA without code) to cause the call to fail
    const nonExistentAddress = ethers.Wallet.createRandom().address;

    // Prepare recipients array
    const recipients = [addr1.address];

    // Attempt to call transfer with a non-existent contract address
    // Original contract should revert because require(_s) fails
    // Mutant should not revert, allowing the transaction to succeed
    const tx = instance.transfer(from.address, nonExistentAddress, recipients, 100);

    // The original contract would revert; the mutant would not
    // We expect the transaction to revert (which kills the mutant because it doesn't revert)
    await expect(tx).to.be.reverted;
  });
});