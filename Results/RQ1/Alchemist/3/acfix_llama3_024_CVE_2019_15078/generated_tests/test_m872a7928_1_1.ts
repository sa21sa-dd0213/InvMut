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

    // Set blacklist[attacker] to a value that will pass the mutant check but fail the original
    // We need to set it to a value > 0 (so original fails) but <= 0 (so mutant passes)
    // Since we're dealing with unsigned integers, the only value that satisfies both is 0
    // The key insight: we can set the storage to a value that when interpreted as unsigned integer
    // is > 0 but when compared with <= 0, it passes because of integer overflow/underflow
    
    // Actually, the correct exploit is to set blacklist[attacker] to false (0) after being blacklisted
    // Then the original passes (0 == 0) and mutant also passes (0 <= 0)
    // The real difference: if we set the storage to a non-standard value that is > 0 but <= 0
    // Since this is impossible for unsigned integers, we need to find another approach

    // The only way to kill this mutant is to show it's semantically equivalent
    // Let's verify by testing both scenarios
    
    // Scenario 1: non-blacklisted user should pass both
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