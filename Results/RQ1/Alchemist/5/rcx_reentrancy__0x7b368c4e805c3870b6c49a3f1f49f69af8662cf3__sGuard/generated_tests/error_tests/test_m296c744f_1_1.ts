import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should detect mutant that uses msg.value-1 instead of msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // User sends exactly 1 wei to Put function
    const tx = await instance.connect(user).Put(0, { value: 1 });
    await tx.wait();

    // Check that balance increased by exactly 1 wei
    const balance = await instance.Acc(user.address);
    expect(balance.balance).to.equal(1);
  });
});