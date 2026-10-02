import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant kill test - m857c1d2c", function () {
  it("should detect mutant where + is replaced with * in require statement by depositing with zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Test case: addr1 has zero balance and deposits 1 ether
    // Original: (0 + 1 ether) >= 0 passes
    // Mutant: (0 * 1 ether) >= 0 passes (both pass for zero balance)
    
    // Instead, test with a non-zero balance where multiplication changes behavior
    // First deposit to get non-zero balance
    await bank.connect(addr1).Deposit({ value: ethers.parseEther("2") });
    
    // Now addr1 has balance of 2 ether
    // Try to deposit 1 wei more
    // Original: (2 ether + 1 wei) >= 2 ether passes
    // Mutant: (2 ether * 1 wei) >= 2 ether FAILS because 2 ether * 1 wei = 2 wei < 2 ether
    await expect(
      bank.connect(addr1).Deposit({ value: 1 })
    ).to.be.reverted;
  });
});