import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection - m12dbf5b3", function () {
  it("should kill mutant by verifying owner is set correctly after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with owner as the deployer's address
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify owner is set to the provided address (not address(0))
    const storedOwner = await instance.owner();
    expect(storedOwner).to.equal(owner.address);
    
    // Send some ether to the contract to have balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt withdrawAll from the legitimate owner - should succeed on original, revert on mutant
    const tx = instance.connect(owner).withdrawAll(owner.address);
    await expect(tx).to.not.be.reverted;
  });
});