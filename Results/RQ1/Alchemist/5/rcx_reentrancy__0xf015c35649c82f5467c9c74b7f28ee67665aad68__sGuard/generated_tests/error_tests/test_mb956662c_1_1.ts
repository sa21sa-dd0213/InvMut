import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mb956662c test", function () {
  it("should kill mutant by verifying Collect works when conditions are met", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Deposit 2 ether with unlock time 1 second from now
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 1;
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Verify balance was recorded
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Now call Collect with 1 ether (valid amount, conditions should be met)
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Collect(collectAmount);
    await tx.wait();

    // Verify ether was transferred - addr1 should have received the ether
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    // On original: balance increases by collectAmount (minus gas)
    // On mutant: balance doesn't change (Collect does nothing)
    expect(finalBalance).to.be.gt(initialBalance);

    // Also verify balance in contract decreased
    const updatedHolder = await instance.Acc(addr1.address);
    expect(updatedHolder.balance).to.equal(depositAmount - collectAmount);
  });
});