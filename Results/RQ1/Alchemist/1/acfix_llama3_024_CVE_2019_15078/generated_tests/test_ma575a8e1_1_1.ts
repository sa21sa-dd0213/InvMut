import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant ma575a8e1 - Transfer event emission", function () {
  it("should emit Transfer event from address(0) when tokens are distributed via getTokens()", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure investor is not blacklisted initially
    expect(await instance.blacklist(investor.address)).to.equal(false);

    // Get the initial totalRemaining and value
    const initialValue = await instance.value();
    const totalRemaining = await instance.totalRemaining();

    // Ensure value is not greater than totalRemaining
    if (initialValue > totalRemaining) {
      // This shouldn't happen in normal deployment, but handle edge case
      await instance.connect(owner).finishDistribution();
    }

    // Call getTokens() which triggers distr internally
    const tx = await instance.connect(investor).getTokens();

    // Expect Transfer event with from=address(0), to=investor, amount=value
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(ethers.ZeroAddress, investor.address, initialValue);
  });
});