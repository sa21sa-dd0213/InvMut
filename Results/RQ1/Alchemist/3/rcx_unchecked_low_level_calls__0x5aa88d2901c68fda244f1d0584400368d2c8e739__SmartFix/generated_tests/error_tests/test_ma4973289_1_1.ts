import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - ma4973289", function () {
  it("should kill mutant by calling Command with msg.value equal to contract balance, expecting revert due to msg.value+1", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ether via receive function
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: instanceAddress,
      value: initialFunding
    });

    // Get contract balance
    const contractBalance = await ethers.provider.getBalance(instanceAddress);

    // Prepare call data (empty bytes)
    const emptyData = "0x";

    // Attempt to call Command with msg.value equal to contract balance
    // In the original, this would succeed; in the mutant, it reverts because msg.value+1 > contract balance
    await expect(
      instance.connect(owner).Command(addr2.address, emptyData, { value: contractBalance })
    ).to.be.reverted;
  });
});