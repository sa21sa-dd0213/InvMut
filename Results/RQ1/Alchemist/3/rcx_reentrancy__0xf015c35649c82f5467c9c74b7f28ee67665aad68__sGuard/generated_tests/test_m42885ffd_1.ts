import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant m42885ffd - reentrancy kill test", function () {
  it("should detect removal of nonReentrant modifier in Collect via reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy a malicious reentrancy contract that will attack the mutant
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await bank.getAddress());
    await malicious.waitForDeployment();
    
    // Fund the attacker's account in the bank by sending ETH through the malicious contract
    // The malicious contract's fallback will call Put(0)
    await attacker.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("5")
    });
    
    // Wait for the transaction to complete
    await ethers.provider.send("evm_mine", []);
    
    // Set unlock time to past to allow Collect
    const currentTime = await ethers.provider.getBlock("latest").then(b => b.timestamp);
    await bank.connect(attacker).Put(currentTime - 100, { value: ethers.parseEther("2") });
    
    // Now trigger the reentrancy attack via the malicious contract
    // The malicious contract's attack function will call Collect with reentrancy
    const attackTx = await malicious.connect(attacker).attack({ value: ethers.parseEther("1") });
    
    // On the ORIGINAL contract this would revert due to nonReentrant modifier
    // On the MUTANT (without modifier) this will succeed and drain funds
    await expect(attackTx).to.be.reverted; // This passes on original, fails on mutant
    
    // Additional check: on mutant, attacker's balance should be drained
    const attackerBalance = await bank.Acc(await malicious.getAddress());
    expect(attackerBalance.balance).to.equal(0);
  });
});

// Malicious reentrancy contract to be deployed alongside the test
contract MaliciousReentrancy {
    address public bank;
    address public owner;
    bool public attacking;
    
    constructor(address _bank) {
        bank = _bank;
        owner = msg.sender;
    }
    
    function attack() external payable {
        attacking = true;
        (bool success, ) = bank.call{value: msg.value}(abi.encodeWithSignature("Collect(uint256)", 1 ether));
        require(success);
    }
    
    fallback() external payable {
        if (attacking) {
            attacking = false;
            // Re-enter Collect before balance is updated
            (bool success, ) = bank.call(abi.encodeWithSignature("Collect(uint256)", 1 ether));
            require(success);
        }
    }
    
    receive() external payable {
        if (attacking) {
            attacking = false;
            (bool success, ) = bank.call(abi.encodeWithSignature("Collect(uint256)", 1 ether));
            require(success);
        }
    }
}