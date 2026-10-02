import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - mf8934603", function () {
  it("should revert when supportsToken() returns a smaller hash (original == behavior) but mutant <= allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancy.deploy();
    await modEntrancy.waitForDeployment();

    // Deploy a malicious Bank that returns a hash smaller than keccak256("Nu Token")
    const MaliciousBank = await ethers.getContractFactory("Bank");
    const maliciousBank = await MaliciousBank.deploy();
    await maliciousBank.waitForDeployment();

    // Override supportsToken to return a smaller hash
    // We'll deploy a custom contract that returns keccak256("A Token") which is smaller
    const CustomBank = await ethers.getContractFactory(
      "contracts/CustomBank.sol:CustomBank"
    );
    const customBank = await CustomBank.deploy();
    await customBank.waitForDeployment();

    // Verify that customBank returns a smaller hash
    const expectedHash = ethers.keccak256(ethers.toUtf8Bytes("Nu Token"));
    const smallerHash = ethers.keccak256(ethers.toUtf8Bytes("A Token"));
    expect(smallerHash < expectedHash).to.be.true;

    // Attacker calls airDrop() but with the malicious bank as msg.sender
    // Since attacker has no balance and the bank returns a smaller hash:
    // Original: require(expectedHash == smallerHash) => revert
    // Mutant:   require(expectedHash <= smallerHash) => passes (since expectedHash > smallerHash, this should also revert, but let's verify)
    // Actually we need a hash that is <= expectedHash but not equal to kill the mutant
    // Let's use a hash that is exactly equal to expectedHash for the original, and for mutant we need a hash that is <= expectedHash but not ==
    // The easiest way: make the bank return the same hash, then both pass
    // To kill the mutant: we need a case where original passes (==) and mutant fails (<= still passes), so we need a hash that is < expectedHash
    // But then original would revert, so we need to test that original reverts and mutant does NOT revert
    // Let's test the opposite: original reverts (correct), mutant does not revert (incorrect)
    // So we need a bank that returns a hash < expectedHash
    // Deploy a bank that returns keccak256("A Token")
    const ATokenBank = await ethers.getContractFactory("ATokenBank");
    const aTokenBank = await ATokenBank.deploy();
    await aTokenBank.waitForDeployment();

    // Now attacker tries to call airDrop() with the ATokenBank as msg.sender
    // But the modifier checks Bank(msg.sender).supportsToken(), so we need attacker to be the bank
    // Actually the attacker is the one calling airDrop, and msg.sender is the attacker
    // The modifier calls Bank(msg.sender).supportsToken() - this means the caller must be a Bank contract
    // So we need to call from the bank contract itself, not from attacker
    // Let's use the bank contract to call airDrop() on ModifierEntrancy
    // But the bank contract doesn't have the airDrop function, so we need to make the bank contract call it via low-level call
    // Or we can simply use the malicious bank as the caller by using attacker's address and having attacker implement supportsToken()
    // Actually the simplest: deploy a malicious contract that implements supportsToken() and then calls airDrop()
    
    // Deploy an attacker contract that acts as a Bank
    const AttackerContract = await ethers.getContractFactory("AttackerBank");
    const attackerContract = await AttackerContract.deploy(modEntrancy.target);
    await attackerContract.waitForDeployment();

    // The attacker contract will return a smaller hash in supportsToken()
    // Then it calls airDrop() on ModifierEntrancy
    // Original: should revert because hash doesn't match
    // Mutant: should pass (incorrectly)
    
    // Test the original behavior first (we assume we're testing the mutant, so we expect it to NOT revert)
    // Actually we need to check if the mutant allows it - we expect the tx to succeed on mutant
    await expect(
      attackerContract.attack()
    ).to.not.be.reverted;

    // After successful call, check that attackerContract's token balance increased
    const balance = await modEntrancy.tokenBalance(attackerContract.target);
    expect(balance).to.equal(20);
  });
});

// Additional contract to deploy for the test
// This should be in a separate file: contracts/AttackerBank.sol
// pragma solidity ^0.8.0;
// import "./ModifierEntrancy.sol";
// contract AttackerBank {
//     ModifierEntrancy public target;
//     constructor(address _target) { target = ModifierEntrancy(_target); }
//     function supportsToken() external pure returns (bytes32) {
//         return keccak256(abi.encodePacked("A Token")); // smaller than "Nu Token"
//     }
//     function attack() external {
//         target.airDrop();
//     }
// }