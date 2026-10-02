import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m9b11bc4b", function () {
  it("should detect mutant that replaces subtraction with division in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    const putAmount = ethers.parseEther("10");
    const collectAmount = ethers.parseEther("2");

    // addr1 puts 10 ETH into the contract
    await instance.connect(addr1).Put(0, { value: putAmount });

    // Verify initial balance
    let holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(putAmount);

    // Set unlock time to 0 so it's immediately collectable
    // (already done via Put(0) which sets unlockTime to block.timestamp)

    // Collect 2 ETH
    await instance.connect(addr1).Collect(collectAmount);

    // Check the balance after collection
    // In original: balance = 10 - 2 = 8 ETH
    // In mutant: balance = 10 / 2 = 5 ETH
    holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("8"));
  });
});