import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m3b2c21d6 - reentrancy guard removed from Put", function () {
  it("should prevent reentrancy in original but allow it in mutant (test fails on mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy attacker contract that will attempt reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund attacker contract with 2 ether
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // Set unlock time to allow withdrawal
    const currentBlock = await ethers.provider.getBlock("latest");
    const futureTime = currentBlock!.timestamp + 1000;
    
    // Attacker calls Put through the bank to set balance and unlock time
    await attackerContract.connect(attacker).attackPut(futureTime, { value: ethers.parseEther("1") });
    
    // Now attempt to exploit - call Collect which triggers fallback -> reentrant Put
    // In original (with guard) this should revert; in mutant (without guard) it succeeds
    const tx = attackerContract.connect(attacker).attackCollect(ethers.parseEther("1"));
    
    // The test expects the transaction to revert (original behavior)
    // If the mutant removes the guard, the transaction will succeed and the test will fail
    await expect(tx).to.be.reverted;
  });
});

// Helper attacker contract (deployed as separate contract for testing)
// This must be compiled alongside the test
contract ReentrancyAttacker {
    address payable public bank;
    
    constructor(address payable _bank) {
        bank = _bank;
    }
    
    function attackPut(uint _unlockTime) external payable {
        (bool success, ) = bank.call{value: msg.value}(abi.encodeWithSignature("Put(uint256)", _unlockTime));
        require(success, "Put failed");
    }
    
    function attackCollect(uint _amount) external {
        (bool success, ) = bank.call(abi.encodeWithSignature("Collect(uint256)", _amount));
        require(success, "Collect failed");
    }
    
    receive() external payable {
        // Reentrancy: call Put again when receiving ETH from Collect
        if (address(this).balance > 0) {
            (bool success, ) = bank.call{value: 0}(abi.encodeWithSignature("Put(uint256)", 0));
            require(success, "Reentrant Put failed");
        }
    }
}