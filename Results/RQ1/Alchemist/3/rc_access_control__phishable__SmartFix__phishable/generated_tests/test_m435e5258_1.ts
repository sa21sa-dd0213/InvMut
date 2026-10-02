import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m435e5258 test", function () {
  it("should revert when owner tries to withdrawAll after constructor sets owner to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with owner as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Verify that the contract was deployed (get the deployed address)
    const contractAddress = await instance.getAddress();
    
    // Send some ether to the contract so withdrawAll has something to transfer
    const tx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Attempt to withdrawAll as the owner - this should revert because the mutant
    // sets owner to address(0) instead of owner.address
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});