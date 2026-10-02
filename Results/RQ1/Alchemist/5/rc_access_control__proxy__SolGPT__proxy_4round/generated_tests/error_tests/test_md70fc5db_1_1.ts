import { expect } from "chai";
import { ethers } from "hardhat";

describe("Proxy mutant detection - require(_s) removal", function () {
  it("should revert when forwarding to a non-existent contract", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Proxy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a random address with no code
    const nonExistentAddress = ethers.Wallet.createRandom().address;
    const dummyData = "0x12345678";

    // The original contract should revert when calling a non-existent address
    // The mutant would not revert
    await expect(
      instance.forward(nonExistentAddress, dummyData)
    ).to.be.reverted;
  });

  it("should revert when forwarding to a contract that reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Proxy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always reverts
    const revertContractFactory = await ethers.getContractFactory(
      "contract Reverter { function fail() external pure { revert('fail'); } }"
    );
    const reverter = await revertContractFactory.deploy();
    await reverter.waitForDeployment();

    // Call forward with data that triggers the revert function
    const failSelector = reverter.interface.getFunction("fail").selector;

    // The original contract should revert when the called function reverts
    // The mutant would not revert
    await expect(
      instance.forward(await reverter.getAddress(), failSelector)
    ).to.be.reverted;
  });
});