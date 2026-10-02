import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - Put with msg.value-1", function () {
  it("should detect mutant by sending 1 wei and checking balance is 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Send exactly 1 wei to Put function via addr1
    const tx = await instance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();

    // Check the balance stored in the contract for addr1
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(1);

    // If mutant is active, balance would be 0 (msg.value-1 = 0) and test would fail
  });
});