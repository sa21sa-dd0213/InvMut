import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test", function () {
  it("should detect mutant that sets owner to address(this) instead of deployer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with owner as the constructor argument
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Send some ether to the contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Try to withdraw from the owner address - should succeed on original, fail on mutant
    // because mutant sets owner to address(this) instead of the passed _owner
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
    
    // Verify the contract balance is now zero after withdrawal
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});