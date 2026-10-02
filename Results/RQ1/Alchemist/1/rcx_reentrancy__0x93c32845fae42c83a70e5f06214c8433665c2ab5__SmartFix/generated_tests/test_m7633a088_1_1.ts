import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Mutant kill test for m7633a088", function () {
  it("should detect the mutant that adds 1 wei extra to balance on Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ETH
    const tx = await instance.connect(user).Put(0, { value: depositAmount });
    await tx.wait();

    // Verify the user's recorded balance
    const holder = await instance.Acc(user.address);

    // In the original contract, balance should equal depositAmount
    // In the mutant, balance = depositAmount + 1 wei (artificially inflated)

    // Try to withdraw the exact deposit amount
    // In the original: should succeed since balance >= amount
    // In the mutant: will revert because actual contract balance is 1 wei less than recorded balance
    //                when trying to send the exact deposit amount back
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});