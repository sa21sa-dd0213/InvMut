import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m7a5ba876 - Distr event emission", function () {
  it("should emit Distr event when getTokens is called (original behavior)", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.be.false;

    // Ensure investor is not blacklisted (onlyWhitelist modifier)
    expect(await instance.blacklist(investor.address)).to.be.false;

    // Call getTokens() which internally calls distr() and should emit Distr event
    const tx = await instance.connect(investor).getTokens();
    const receipt = await tx.wait();

    // Check that the Distr event was emitted with correct parameters
    // The event signature: Distr(address indexed to, uint256 amount)
    // Get the current value to determine expected amount
    const currentValue = await instance.value();
    const expectedAmount = currentValue; // value is passed as toGive to distr

    await expect(tx)
      .to.emit(instance, "Distr")
      .withArgs(investor.address, expectedAmount);
  });
});