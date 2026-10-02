import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m435e5258 detection", function () {
  it("should kill mutant by verifying owner can withdraw after deployment with non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with owner address
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Send some ETH to the contract so there's balance to withdraw
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // On original: owner can withdraw successfully
    // On mutant: owner is address(0), so this will revert
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.not.be.reverted;
  });
});