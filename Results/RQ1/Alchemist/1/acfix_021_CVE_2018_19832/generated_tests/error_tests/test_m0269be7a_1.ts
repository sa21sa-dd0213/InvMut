import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Transfer event from address(0) when getTokens is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH to allow getTokens to work
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Check that distribution is not finished and value <= totalRemaining
    const value = await instance.value();
    const totalRemaining = await instance.totalRemaining();
    expect(value).to.be.lte(totalRemaining);

    // Call getTokens from addr1 and capture the transaction
    const tx = await instance.connect(addr1).getTokens({ value: ethers.parseEther("0") });
    const receipt = await tx.wait();

    // Get the expected amount that should be distributed
    const toGive = await instance.value();

    // Verify that Transfer event was emitted with from=address(0), to=addr1, amount=toGive
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(ethers.ZeroAddress, addr1.address, toGive);
  });
});