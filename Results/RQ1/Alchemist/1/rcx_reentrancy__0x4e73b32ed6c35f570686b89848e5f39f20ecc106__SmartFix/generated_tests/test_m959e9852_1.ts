import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant m959e9852 test", function () {
  it("should detect division mutation in Collect by checking balance after withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetMinSum(10);
    await instance.connect(owner).SetLogFile(ethers.ZeroAddress);
    await instance.connect(owner).Initialized();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("100");
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Get initial balance
    const initialBalance = await instance.balances(addr1.address);
    expect(initialBalance).to.equal(depositAmount);

    // Collect 30 wei (not a divisor of 100)
    const collectAmount = ethers.parseEther("30");
    await instance.connect(addr1).Collect(collectAmount, { value: 0 });

    // In original: balance = 100 - 30 = 70
    // In mutant: balance = 100 / 30 = 3 (integer division)
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance).to.equal(ethers.parseEther("70"));
  });
});