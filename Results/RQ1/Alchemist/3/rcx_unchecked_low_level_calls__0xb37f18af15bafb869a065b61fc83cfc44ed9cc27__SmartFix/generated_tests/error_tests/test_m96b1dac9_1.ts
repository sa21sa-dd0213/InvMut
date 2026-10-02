import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should prevent non-owner from calling withdraw and revert, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdraw from non-owner address - should revert in original, but succeed in mutant
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the mutant, the onlyOwner modifier is removed, so addr1 can call withdraw
    // The test expects a revert to catch the mutant (if it doesn't revert, the mutant is killed)
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Verify no funds were moved (original behavior)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});