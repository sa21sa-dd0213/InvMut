import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant detection - contractURI", function () {
  it("should return the correct IPFS URI from contractURI()", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, owner.address);
    await instance.waitForDeployment();

    const expectedURI = "ipfs://bafybeih3witscmml3padf4qxbea5jh4rl2xp67aydqvqsxmyuzipwtpnii";
    const actualURI = await instance.contractURI();
    
    expect(actualURI).to.equal(expectedURI);
  });
});