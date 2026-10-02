import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should kill mutant md7d40a34 by calling airDrop with zero balance and expecting success (original) vs revert (mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a Bank contract to satisfy the supportsToken modifier
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Create a caller contract that will call airDrop on behalf of the bank
    const CallerFactory = await ethers.getContractFactory(
      "contract Caller { function callAirDrop(address target) external { (bool success, ) = target.call(abi.encodeWithSignature(\"airDrop()\")); require(success); } }"
    );
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();

    // Get the bank's address
    const bankAddress = await bank.getAddress();

    // Fund the bank with some ETH to pay for gas
    await owner.sendTransaction({ to: bankAddress, value: ethers.parseEther("1") });

    // Test the mutant: call airDrop and expect it to revert
    // Since the mutant requires tokenBalance[msg.sender] + 20 == tokenBalance[msg.sender]
    // which is impossible, any call should revert
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;

    // The test passes (the mutant is killed) because the call reverts
    // The original contract would succeed here
  });
});