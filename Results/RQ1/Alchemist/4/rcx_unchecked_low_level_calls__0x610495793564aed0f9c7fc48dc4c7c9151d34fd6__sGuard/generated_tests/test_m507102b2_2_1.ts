import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow non-owner to call withdrawAll when onlyOwner modifier is removed (kills mutant m507102b2)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Test that the owner can successfully call withdrawAll (original behavior)
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractAddress = await instance.getAddress();
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    
    const tx = await instance.connect(owner).withdrawAll();
    const receipt = await tx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(contractBalanceAfter).to.equal(0);
    
    // Additional verification: owner should have received the funds
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    // Check that owner's balance increased (minus gas costs)
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore.sub(receipt.gasUsed * receipt.gasPrice));
    
    // Now test that a non-owner call to withdrawAll reverts (original behavior)
    // This will also revert on the mutant but with a different error
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith("onlyOwner");
    
    // Verify contract has zero balance after the test
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    expect(finalBalance).to.equal(0);
  });
});