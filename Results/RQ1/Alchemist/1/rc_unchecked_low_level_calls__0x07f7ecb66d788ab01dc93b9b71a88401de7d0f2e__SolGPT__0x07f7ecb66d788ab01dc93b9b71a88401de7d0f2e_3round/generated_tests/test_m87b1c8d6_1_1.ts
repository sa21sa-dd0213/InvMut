import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - m87b1c8d6", function () {
  it("should revert when msg.value is exactly betLimit + 1 on original, but pass on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");

    // Deploy the contract (original)
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Open to public
    await instance.connect(owner).OpenToThePublic();

    // Set difficulty to avoid division by zero
    await instance.connect(owner).AdjustDifficulty(10);

    // Try to wager with msg.value = betLimit + 1 wei
    const overBetLimit = wagerLimit + 1n;

    // On the original contract, this should revert because msg.value != betLimit
    await expect(
      instance.connect(addr1).wager({ value: overBetLimit })
    ).to.be.reverted;

    // Now deploy a mutant version (simulate by deploying a contract with the mutated logic)
    // Since we cannot modify the deployed bytecode directly, we verify the behavior:
    // The mutant would accept overBetLimit, but original reverts - this test kills the mutant
  });
});