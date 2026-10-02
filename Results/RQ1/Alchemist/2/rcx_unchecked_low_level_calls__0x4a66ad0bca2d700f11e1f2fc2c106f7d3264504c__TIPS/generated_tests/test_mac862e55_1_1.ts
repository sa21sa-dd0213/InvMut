import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mac862e55 test", function () {
  it("should revert when calling transfer with from set to address(0)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the from address is zero in the mutant
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal(ethers.ZeroAddress);

    // Prepare test data
    const recipients = ["0x1234567890123456789012345678901234567890"];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)

    // Attempt to call transfer - should revert because transferFrom will fail
    // with address(0) as the source
    await expect(
      instance.transfer(recipients, amounts)
    ).to.be.reverted;
  });
});