import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to withdraw all balance (kill mutant mafd2c245)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract via fallback
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner tries to withdraw all - should succeed in original, fail in mutant
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
  });
});