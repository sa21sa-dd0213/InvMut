import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m70366a19", function () {
  it("should detect mutant that changed >= to > by withdrawing exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get the MinSum value (1 ether)
    const minSum = await instance.MinSum();
    
    // Deposit exactly MinSum (1 ether) from addr1
    const depositTx = await instance.connect(addr1).Put(0, { value: minSum });
    await depositTx.wait();
    
    // Verify balance is exactly MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(minSum);
    
    // Attempt to withdraw exactly the balance amount
    // In original: acc.balance >= _am allows this (equal amounts)
    // In mutant: acc.balance > _am rejects this (equal amounts fail)
    await expect(
      instance.connect(addr1).Collect(minSum)
    ).to.be.reverted;
  });
});