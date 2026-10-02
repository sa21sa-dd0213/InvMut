import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m18139b06 (withdraw: == replaced with !=)", function () {
  it("should allow owner to withdraw and fail on mutant (owner call reverts)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Record owner balance before withdrawal
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Owner calls withdraw - should succeed in original, revert in mutant
    const tx = instance.connect(owner).withdraw();
    
    // In original: owner can withdraw, balance changes
    // In mutant: owner call reverts (msg.sender == Owner is false, so require(msg.sender != Owner) fails)
    await expect(tx).to.changeEtherBalance(
      owner,
      contractBalanceBefore,
      { error: "Owner withdrawal should transfer contract balance" }
    );
  });
});