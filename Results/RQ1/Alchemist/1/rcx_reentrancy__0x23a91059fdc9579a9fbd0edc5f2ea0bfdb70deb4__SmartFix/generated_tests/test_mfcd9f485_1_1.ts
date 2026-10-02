import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - Deposit logging", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by PrivateBank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy PrivateBank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1");
    
    // Perform deposit
    const tx = await bank.connect(user).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Get the logged message from History (index 0 = first deposit)
    const loggedMessage = await logContract.History(0);
    const loggedVal = loggedMessage.Val;
    
    // Original contract logs msg.value, mutant logs msg.value-1
    // So if loggedVal equals depositAmount, it's the original; if less by 1 wei, it's the mutant
    expect(loggedVal).to.equal(depositAmount);
  });
});