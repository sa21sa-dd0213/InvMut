import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - m87cf6694", function () {
  it("should kill mutant by sending ether when depositsCount is at max uint256 and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract address to send ether to it
    const contractAddress = await instance.getAddress();

    // Send ether to the contract multiple times to increase depositsCount
    for (let i = 0; i < 5; i++) {
      await owner.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("0.001")
      });
    }

    // Check depositsCount is now 5
    expect(await instance.depositsCount()).to.equal(5);

    // Send ether with value 0 to test edge case behavior
    await expect(
      owner.sendTransaction({
        to: contractAddress,
        value: 0
      })
    ).to.not.be.reverted;

    // Verify depositsCount increased
    expect(await instance.depositsCount()).to.equal(6);

    // Now test that the contract works correctly after many deposits
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    await instance.connect(owner).withdrawAll();
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(balanceAfter).to.equal(0);
  });
});