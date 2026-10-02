import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m9a34ecee test", function () {
  it("should emit Distr event when getTokens is called, killing the mutant that removed the event emission", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished and investor is not blacklisted
    expect(await instance.distributionFinished()).to.equal(false);
    expect(await instance.blacklist(investor.address)).to.equal(false);

    // Investor calls getTokens() to trigger distr()
    const tx = await instance.connect(investor).getTokens();
    const receipt = await tx.wait();

    // Check that the Distr event was emitted with the investor address and correct amount
    const event = receipt.logs.find(
      (log: any) => log.fragment && log.fragment.name === "Distr"
    );
    expect(event).to.not.be.undefined;
    const [to, amount] = event.args;
    expect(to).to.equal(investor.address);
    expect(amount).to.equal(await instance.value());
  });
});