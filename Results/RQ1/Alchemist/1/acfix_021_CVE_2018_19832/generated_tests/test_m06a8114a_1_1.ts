import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m06a8114a test", function () {
  it("should detect mutant by setting blacklist to a negative value via storage manipulation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the storage slot for blacklist[addr1.address]
    // blacklist is mapping(address => bool) at slot 3 (0-indexed: owner=0, balances=1, allowed=2, blacklist=3)
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [addr1.address, 3]
      )
    );

    // Set blacklist[addr1] to a negative value (as uint256, this is a very large number)
    // In Solidity, bool false = 0, true = 1. Setting to 0xffff... would be negative when interpreted as int
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    ]);

    // Now try to call getTokens() which uses the onlyWhitelist modifier
    // Original contract would revert because blacklist[addr1] != false (0)
    // Mutant would pass because blacklist[addr1] <= false (0) is true (negative <= 0)
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});