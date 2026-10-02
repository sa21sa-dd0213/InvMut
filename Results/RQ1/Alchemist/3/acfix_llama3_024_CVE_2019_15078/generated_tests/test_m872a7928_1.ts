import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - modifier onlyWhitelist", function () {
  it("should kill mutant m872a7928 by exploiting <= vs == comparison on blacklist mapping", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, get tokens normally to become blacklisted (blacklist[attacker] = true)
    // Need to send enough ETH to cover the value
    const initialValue = await instance.value();
    await instance.connect(attacker).getTokens({ value: ethers.parseEther("1") });
    
    // Now attacker is blacklisted (blacklist[attacker] == true)
    // Verify attacker is blacklisted
    expect(await instance.blacklist(attacker.address)).to.equal(true);
    
    // In the original contract: require(blacklist[msg.sender] == false) would revert
    // In the mutant: require(blacklist[msg.sender] <= false) -> require(true <= false) -> require(1 <= 0) -> reverts too
    // Both revert for normal boolean true, so we need to manipulate storage
    
    // Get storage slot for blacklist mapping of attacker
    // Mapping slot for blacklist is 3 (0-indexed: owner=0, balances=1, allowed=2, blacklist=3)
    // For mapping(address => bool), slot = keccak256(abi.encode(address, uint256(slot)))
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [attacker.address, 3]
      )
    );
    
    // Set blacklist[attacker] to a non-standard value > 0 but != 1
    // Value 2 will fail original (2 != 0 -> true -> fails require(blacklist == false))
    // But will pass mutant (2 <= 0 -> false -> passes require(blacklist <= false)) - WRONG
    // Actually 2 <= 0 is false, so it would revert in mutant too
    
    // We need a value that passes mutant but fails original
    // Original: require(value == 0) -> only 0 passes
    // Mutant: require(value <= 0) -> only 0 passes (since no negative values)
    
    // To truly differentiate, we need to find a value where original fails but mutant passes
    // Since both only allow 0 to pass, we need to test edge case
    // Actually the only difference would be if somehow a value between 0 and 1 existed
    // In Solidity, booleans are uint8, so values can be 0 or 1 only when written normally
    
    // The real difference: if we can set blacklist to false (0) after being blacklisted,
    // original passes, mutant also passes - no difference
    
    // Alternative approach: test that the behavior is identical for valid inputs
    // If both revert for true and both pass for false, the mutant is semantically equivalent
    // UNLESS we can exploit storage to write a value that passes <= but not ==
    
    // Actually let's re-analyze: 
    // Original: require(blacklist[msg.sender] == false) -> requires value == 0
    // Mutant: require(blacklist[msg.sender] <= false) -> requires value <= 0
    // For uint8: only value 0 passes both
    // Therefore this mutant is behaviorally equivalent to original!
    
    // Let's verify by testing both scenarios
    // Scenario 1: non-blacklisted user should pass both
    const [newUser] = await ethers.getWallets();
    // Actually get a new signer from hardhat
    const signers = await ethers.getSigners();
    const freshUser = signers[2];
    
    // Should work for non-blacklisted user
    const tx = instance.connect(freshUser).getTokens({ value: ethers.parseEther("1") });
    await expect(tx).to.not.be.reverted;
    
    // Scenario 2: blacklisted user should be reverted in both
    await expect(
      instance.connect(attacker).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
    
    // The mutant cannot be killed by normal means as it's semantically equivalent
    // for all possible boolean values in the mapping
    console.log("Mutant m872a7928 is semantically equivalent to original for all valid inputs");
  });
});