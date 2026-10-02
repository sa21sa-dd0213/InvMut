import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m6b9116b2 test", function () {
  it("should revert when CashOut external call fails, preventing balance reduction", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy Private_Bank with the Log contract address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();
    
    // Deploy a malicious contract that will reject incoming Ether
    const MaliciousFactory = await ethers.getContractFactory(
      "contract MaliciousReceiver { function executeDeposit(address bank, uint256 value) public payable { (bool success,) = bank.call{value: msg.value}(abi.encodeWithSignature('Deposit()')); require(success); } function executeCashOut(address bank, uint256 amount) public { (bool success,) = bank.call(abi.encodeWithSignature('CashOut(uint256)', amount)); require(success); } receive() external payable { revert(); } }"
    );
    const maliciousContract = await MaliciousFactory.deploy();
    await maliciousContract.waitForDeployment();
    
    const maliciousAddress = await maliciousContract.getAddress();
    
    // Fund the malicious contract with enough Ether to deposit
    await owner.sendTransaction({
      to: maliciousAddress,
      value: ethers.parseEther("2")
    });
    
    // Have the malicious contract deposit funds into Private_Bank
    await maliciousContract.executeDeposit(bank.getAddress(), ethers.parseEther("2"), { value: ethers.parseEther("2") });
    
    // Verify balance was recorded
    let balance = await bank.balances(maliciousAddress);
    expect(balance).to.equal(ethers.parseEther("2"));
    
    // Attempt cashout - this should revert because malicious contract rejects incoming Ether
    await expect(
      maliciousContract.executeCashOut(bank.getAddress(), ethers.parseEther("1"))
    ).to.be.reverted;
    
    // Check balance after failed cashout - should remain unchanged
    balance = await bank.balances(maliciousAddress);
    expect(balance).to.equal(ethers.parseEther("2"));
  });
});