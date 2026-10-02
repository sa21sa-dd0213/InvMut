import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - transferFrom zero address check", function () {
  it("should revert when transferring to address(0) in original, but mutant incorrectly allows it; test that transfer to non-zero address succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First need to get tokens to test transferFrom
    // The getTokens function requires distribution not finished and sender not blacklisted
    // Send some ETH to trigger getTokens via receive()

    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now owner should have some tokens, approve addr1 to spend
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.be.gt(0);
    
    await instance.connect(owner).approve(addr1.address, ownerBalance);
    
    // Test: transferFrom from owner to a valid non-zero address (addr2)
    // In original: this should succeed because _to != address(0)
    // In mutant: this should revert because require(_to == address(0)) fails for non-zero addr
    await expect(
      instance.connect(addr1).transferFrom(owner.address, addr2.address, ownerBalance)
    ).to.not.be.reverted;
    
    // Verify the transfer actually happened
    const addr2Balance = await instance.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(ownerBalance);
  });
});