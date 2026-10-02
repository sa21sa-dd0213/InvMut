import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m296c744f", function () {
  it("should detect mutant that subtracts 1 from msg.value in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    const putAmount = ethers.parseEther("1.0");

    // Call Put with exactly 1 ether
    const tx = await instance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();

    // Check that the recorded balance equals the sent amount (not sent amount minus 1)
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(putAmount);
  });
});