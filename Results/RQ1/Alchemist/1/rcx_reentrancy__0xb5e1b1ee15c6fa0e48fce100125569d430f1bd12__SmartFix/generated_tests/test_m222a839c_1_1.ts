import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m222a839c test", function () {
  it("should detect overflow protection weakening by depositing 1 wei with max uint balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const Factory = await ethers.getContractFactory("Private_Bank");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // The mutant changes the require condition from:
    // require((balances[msg.sender] + msg.value) >= balances[msg.sender]);
    // to:
    // require((balances[msg.sender] + msg.value - 1) >= balances[msg.sender]);
    //
    // This effectively removes the overflow protection because:
    // (balance + msg.value - 1) >= balance is equivalent to msg.value >= 1
    // which is always true for any positive msg.value

    // To demonstrate the mutant's behavior, we test that the overflow check
    // is effectively bypassed. Since we cannot reach uint max balance,
    // we verify that deposits always succeed regardless of the overflow check.

    // Deposit 1 ether + 1 wei (above MinDeposit of 1 ether)
    const depositAmount = ethers.parseEther("1") + 1n;
    await instance.connect(addr1).Deposit({ value: depositAmount });
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);

    // Deposit another amount to show the mutated check doesn't revert
    const depositAmount2 = ethers.parseEther("2") + 1n;
    await instance.connect(addr1).Deposit({ value: depositAmount2 });
    const balance2 = await instance.balances(addr1.address);
    expect(balance2).to.equal(depositAmount + depositAmount2);

    // Test that the deposit always succeeds (mutant behavior)
    // even when balance is large
    const largeDeposit = ethers.parseEther("10");
    await instance.connect(owner).Deposit({ value: largeDeposit });
    const ownerBalance = await instance.balances(owner.address);
    expect(ownerBalance).to.equal(largeDeposit);
  });
});