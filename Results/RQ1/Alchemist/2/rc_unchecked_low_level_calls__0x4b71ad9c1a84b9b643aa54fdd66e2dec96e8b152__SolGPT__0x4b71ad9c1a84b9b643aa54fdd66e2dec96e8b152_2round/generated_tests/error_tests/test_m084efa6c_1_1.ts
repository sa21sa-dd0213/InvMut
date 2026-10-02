import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - missing require check", function () {
  it("should revert when external call fails, but mutant passes silently", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy the airPort contract
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Deploy a simple contract that will fail on transferFrom
    const FailTransferFactory = await ethers.getContractFactory("FailTransfer");
    const failContract = await FailTransferFactory.deploy();
    await failContract.waitForDeployment();

    // Prepare the call
    const recipients = [to.address];
    const value = ethers.parseEther("1");

    // The external call to failContract.transferFrom should fail, causing revert in original
    // But mutant will not revert and return true
    await expect(
      airPort.transfer(from.address, failContract.target, recipients, value)
    ).to.be.reverted;
  });
});