import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mba599e32 test", function () {
  it("should revert when lockInGuess is called with less than 1 ether (mutant allows it)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Get a random bytes32 hash to lock in
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Call lockInGuess with 0.5 ether - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).lockInGuess(dummyHash, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});