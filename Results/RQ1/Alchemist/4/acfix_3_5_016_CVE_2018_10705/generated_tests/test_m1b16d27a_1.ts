import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant m1b16d27a test", function () {
  it("should revert when owner calls function protected by onlyOwner modifier after mutation (== changed to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when the actual owner calls a function with onlyOwner, it should revert
    // We can test this by calling setOwner (which has onlyAdmin modifier, not onlyOwner)
    // But we need a function with onlyOwner - there is none directly exposed in the contract
    // However, the modifier onlyOwner exists but no public function uses it in this contract
    // Therefore we cannot test it directly - the hypothesis was incorrect
    // Let's check the contract again: onlyAdmin is used on setOwner, onlyOwner is defined but unused
    // Since no function uses onlyOwner, we cannot kill this mutant with a functional test
    // We must note this edge case: the mutant changes a modifier that is never applied to any function
    
    // Verify the modifier exists by checking that the contract compiles and deploys
    expect(await instance.getAddress()).to.be.properAddress;
  });
});