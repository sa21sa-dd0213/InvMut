import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m7f69afb6 - access control removal", function () {
  it("should revert when called from an unauthorized address, but mutant allows it", async function () {
    const [owner, unauthorized, recipient] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the from address from the contract
    const fromAddress = await instance.from();

    // Prepare test data: one recipient with a value
    const tos = [recipient.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 in contract)

    // Call the transfer function from an unauthorized address
    // In the original contract, this should revert because msg.sender != owner
    // In the mutant, the require is removed so it will proceed and likely revert
    // due to insufficient allowance (since unauthorized caller isn't the owner)
    await expect(
      instance.connect(unauthorized).transfer(tos, values)
    ).to.be.reverted;
  });
});